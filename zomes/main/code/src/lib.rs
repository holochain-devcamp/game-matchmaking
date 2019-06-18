#![feature(try_from, proc_macro_hygiene)]
#[macro_use]
extern crate hdk;
extern crate serde;
#[macro_use]
extern crate serde_derive;
extern crate serde_json;
#[macro_use]
extern crate holochain_core_types_derive;
extern crate hdk_proc_macros;
use hdk_proc_macros::zome;

use hdk::{
    AGENT_ADDRESS,
    entry_definition::ValidatingEntryType,
    error::ZomeApiResult,
};
use hdk::holochain_core_types::{
    cas::content::Address,
    entry::Entry,
    dna::entry_types::Sharing,
    error::HolochainError,
    json::{JsonString},
    validation::EntryValidationData,
    cas::content::AddressableContent,
};


#[derive(Serialize, Deserialize, Debug, DefaultJson, Clone)]
struct GameProposal {
    agent: Address,
    message: String,
}

#[zome]
pub mod main {

    #[genesis]
    pub fn genesis() {
        Ok(())
    }

    #[entry_def]
    pub fn game_proposal_def() -> ValidatingEntryType {
        entry!(
            // we will need to use this name when creating an entry later
            name: "game_proposal",
            description: "Represents an agent advertizing they wish to play a game at this time",
            // Public sharing means this entry goes to the local chain *and* DHT
            sharing: Sharing::Public, 
            validation_package: || {
                // This defines the data required for the validation callback.
                // In this case it is just the entry data itself
                hdk::ValidationPackageDefinition::Entry
            },
            validation: | validation_data: hdk::EntryValidationData<GameProposal>| {
                match validation_data {
                    // only match if the entry is being created (not modified or deleted)
                    EntryValidationData::Create{ entry, validation_data } => {
                        let game_proposal = GameProposal::from(entry);
                        if validation_data.sources().contains(&game_proposal.agent) {
                            Ok(())
                        } else {
                            Err("Cannot author a proposal from another agent".into())
                        }
                        
                    },
                    EntryValidationData::Delete{..} => {
                        Ok(())
                    },
                    _ => {
                        Err("Cannot modify, only create and delete".into())
                    }
                }
            }
        )
    }

    #[entry_def]
    pub fn anchor_def() -> ValidatingEntryType {
        entry!(
            name: "anchor",
            description: "Central known location to link from",
            sharing: Sharing::Public, 
            validation_package: || { hdk::ValidationPackageDefinition::Entry },
            validation: | _validation_data: hdk::EntryValidationData<String>| {
                Ok(())
            },
            links: [
                to!(
                    "game_proposal", // this must match exactly the target entry type
                    link_type: "has_proposal", // must use this when creating the link
                    validation_package: || {
                        hdk::ValidationPackageDefinition::Entry
                    },
                    validation: | _validation_data: hdk::LinkValidationData| {
                        Ok(())
                    }
                )
            ]
        )
    }

    #[zome_fn("hc_public")]
    fn create_proposal(message: String) -> ZomeApiResult<Address> {

        // create the data as a struct
        let game_proposal_data = GameProposal { 
            agent: AGENT_ADDRESS.to_string().into(),
            message,
        };
        
        // create an entry
        let entry = Entry::App(
            "game_proposal".into(),
            game_proposal_data.into(),
        );
        
        // commit the entry. '?' means return immedietly on error
        let proposal_address = hdk::commit_entry(&entry)?;
        
        // create an anchor entry and commit.
        // The native type is string so we can skip the first step
        let anchor_entry = Entry::App(
            "anchor".into(),
            "game_proposals".into(),
        );
        let anchor_address = hdk::commit_entry(&anchor_entry)?;
        
        // finally link them together
        hdk::link_entries(
            &anchor_address,
            &proposal_address,
            "has_proposal", // the link type, defined on the base entry
            "",
        )?;
        
        // return the proposal address
        Ok(proposal_address)
    }

    #[zome_fn("hc_public")]
    fn get_proposals() -> ZomeApiResult<Vec<GameProposal>> {
        // define the anchor entry again and compute its hash
        let anchor_address = Entry::App(
            "anchor".into(),
            "game_proposals".into()
        ).address();
        
        hdk::utils::get_links_and_load_type(
            &anchor_address, 
            Some("has_proposal".into()), // the link type to match,
            None,
        )
    }
}
